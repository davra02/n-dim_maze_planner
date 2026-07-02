(define (problem maze-3d-reconstructed)
  (:domain temporal-maze)
  (:objects
    c000 c001 c002 c010 c011 c012 c020 c021 c022 c100 c101 c102 c110 c111 c112 c121 c122 c200 c201 c211 c212 c221 c222 - cell
    b1 b2 b3 b4 - button
    d1 d2 d3 d4 d5 d6 - door
    e1 - elevator
    a1 - agent
  )

  (:init
    (agent-at a1 c000)
    (agent-free a1)

    (adjacent c000 c001)
    (adjacent c001 c000)
    (adjacent c001 c002)
    (adjacent c001 c011)
    (adjacent c002 c001)
    (adjacent c010 c011)
    (adjacent c010 c020)
    (adjacent c011 c001)
    (adjacent c011 c010)
    (adjacent c011 c021)
    (adjacent c020 c010)
    (adjacent c020 c021)
    (adjacent c021 c011)
    (adjacent c021 c020)
    (adjacent c021 c022)
    (adjacent c022 c021)
    (adjacent c100 c101)
    (adjacent c101 c100)
    (adjacent c102 c112)
    (adjacent c110 c111)
    (adjacent c111 c110)
    (adjacent c111 c112)
    (adjacent c112 c102)
    (adjacent c112 c111)
    (adjacent c200 c201)
    (adjacent c201 c200)
    (adjacent c201 c211)
    (adjacent c211 c201)
    (adjacent c211 c212)
    (adjacent c212 c211)

    (connects d1 c002 c012)
    (connects d1 c012 c002)
    (connects d2 c121 c122)
    (connects d2 c122 c121)
    (connects d3 c111 c121)
    (connects d3 c121 c111)
    (connects d4 c221 c222)
    (connects d4 c222 c221)
    (connects d5 c101 c102)
    (connects d5 c102 c101)
    (connects d6 c211 c221)
    (connects d6 c221 c211)

    (stairs c012 c112)
    (stairs c112 c012)

    (elevator-connects e1 c111 c211)
    (elevator-connects e1 c211 c111)

    (up b1 d1)
    (up b2 d2)
    (up b3 d4)
    (up b4 d3)

    (up-elevator b4 e1)

    (button-at b1 c021)
    (button-at b2 c100)
    (button-at b3 c122)
    (button-at b4 c020)

    (= (total-cost) 0)
  )

  (:goal (and
    (agent-at a1 c222)
  ))

  (:metric minimize (total-cost))
)
