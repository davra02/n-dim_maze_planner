(define (problem maze-3x3x5-singlepath)
  (:domain temporal-maze)
  (:objects
    ;; Main path (row 0) across all 5 levels
    c0_0_0 c0_0_1 c0_0_2
    c1_0_0 c1_0_1 c1_0_2
    c2_0_0 c2_0_1 c2_0_2
    c3_0_0 c3_0_1 c3_0_2
    c4_0_0 c4_0_1 c4_0_2

    ;; Button branch on level 2, row 3 (y=3)
    c2_3_0 c2_3_1 c2_3_2 - cell

    b1 - button
    d1 - door

    a1 - agent
  )

  (:init
    (agent-at a1 c0_0_0)
    (agent-free a1)

    ;; Single corridor on each level (row 0)
    (adjacent c0_0_0 c0_0_1) (adjacent c0_0_1 c0_0_0)
    (adjacent c0_0_1 c0_0_2) (adjacent c0_0_2 c0_0_1)

    (adjacent c1_0_0 c1_0_1) (adjacent c1_0_1 c1_0_0)
    (adjacent c1_0_1 c1_0_2) (adjacent c1_0_2 c1_0_1)

    (adjacent c2_0_0 c2_0_1) (adjacent c2_0_1 c2_0_0)
    ;; Door blocks access to c2_0_2
    (connects d1 c2_0_1 c2_0_2)
    (connects d1 c2_0_2 c2_0_1)

    (adjacent c3_0_0 c3_0_1) (adjacent c3_0_1 c3_0_0)
    (adjacent c3_0_1 c3_0_2) (adjacent c3_0_2 c3_0_1)

    (adjacent c4_0_0 c4_0_1) (adjacent c4_0_1 c4_0_0)
    (adjacent c4_0_1 c4_0_2) (adjacent c4_0_2 c4_0_1)

    ;; Button branch on level 2, row 3
    (adjacent c2_3_0 c2_3_1) (adjacent c2_3_1 c2_3_0)
    (adjacent c2_3_1 c2_3_2) (adjacent c2_3_2 c2_3_1)

    ;; Stairs between levels at column 0 (to reach level 2)
    (stairs c0_0_0 c1_0_0)
    (stairs c1_0_0 c0_0_0)
    (stairs c1_0_0 c2_0_0)
    (stairs c2_0_0 c1_0_0)

    ;; Stairs between levels at column 2 (after the door)
    (stairs c2_0_2 c3_0_2)
    (stairs c3_0_2 c2_0_2)
    (stairs c3_0_2 c4_0_2)
    (stairs c4_0_2 c3_0_2)

    ;; Stairs to reach the button branch (row 3 on level 2)
    (stairs c2_0_0 c2_3_0)
    (stairs c2_3_0 c2_0_0)

    ;; Button opens door; corner of the level-2 branch
    (up b1 d1)
    (button-at b1 c2_3_0)

    (= (total-cost) 0)
  )

  (:goal (and
    (agent-at a1 c4_0_2)
  ))

  (:metric minimize (total-cost))
)
